import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple hash function for PIN (bcrypt would be better but requires external deps)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + Deno.env.get('PIN_SALT') || 'medical-erp-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();
    console.log(`Auth PIN action: ${action}`);

    switch (action) {
      case 'login': {
        const { userId, pin } = params;
        
        if (!userId || !pin) {
          return new Response(
            JSON.stringify({ error: 'userId et pin requis' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate PIN format (4-6 digits)
        if (!/^\d{4,6}$/.test(pin)) {
          return new Response(
            JSON.stringify({ error: 'Le PIN doit contenir 4 à 6 chiffres' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get user
        const { data: user, error: userError } = await supabase
          .from('app_users')
          .select('*')
          .eq('id', userId)
          .eq('is_active', true)
          .single();

        if (userError || !user) {
          console.log('User not found:', userError);
          return new Response(
            JSON.stringify({ error: 'Utilisateur non trouvé' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if account is locked
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
          const lockMinutes = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
          return new Response(
            JSON.stringify({ error: `Compte verrouillé. Réessayez dans ${lockMinutes} minute(s)` }),
            { status: 423, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify PIN
        const pinHash = await hashPin(pin);
        if (pinHash !== user.pin_hash) {
          // Increment failed attempts
          const newAttempts = (user.failed_attempts || 0) + 1;
          const updateData: any = { failed_attempts: newAttempts };
          
          // Lock account after 3 failed attempts for 15 minutes
          if (newAttempts >= 3) {
            updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            updateData.failed_attempts = 0;
          }

          await supabase
            .from('app_users')
            .update(updateData)
            .eq('id', userId);

          const attemptsLeft = 3 - newAttempts;
          return new Response(
            JSON.stringify({ 
              error: attemptsLeft > 0 
                ? `PIN incorrect. ${attemptsLeft} tentative(s) restante(s)` 
                : 'Compte verrouillé pour 15 minutes'
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Clean up expired sessions
        await supabase.rpc('cleanup_expired_sessions');

        // Generate session token
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create session
        const { error: sessionError } = await supabase
          .from('app_sessions')
          .insert({
            user_id: userId,
            session_token: sessionToken,
            expires_at: expiresAt.toISOString()
          });

        if (sessionError) {
          console.error('Session creation error:', sessionError);
          return new Response(
            JSON.stringify({ error: 'Erreur création session' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Reset failed attempts and update last login
        await supabase
          .from('app_users')
          .update({ 
            failed_attempts: 0, 
            locked_until: null,
            last_login: new Date().toISOString() 
          })
          .eq('id', userId);

        console.log(`User ${user.prenom} ${user.nom} logged in successfully`);

        return new Response(
          JSON.stringify({ 
            success: true,
            sessionToken,
            user: {
              id: user.id,
              nom: user.nom,
              prenom: user.prenom,
              role: user.role
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify': {
        const { sessionToken } = params;
        
        if (!sessionToken) {
          return new Response(
            JSON.stringify({ valid: false, error: 'Token requis' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: session, error: sessionError } = await supabase
          .from('app_sessions')
          .select('*, app_users(*)')
          .eq('session_token', sessionToken)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (sessionError || !session) {
          return new Response(
            JSON.stringify({ valid: false }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const user = session.app_users;
        if (!user || !user.is_active) {
          return new Response(
            JSON.stringify({ valid: false }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            valid: true,
            user: {
              id: user.id,
              nom: user.nom,
              prenom: user.prenom,
              role: user.role
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'logout': {
        const { sessionToken } = params;
        
        if (sessionToken) {
          await supabase
            .from('app_sessions')
            .delete()
            .eq('session_token', sessionToken);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_user': {
        const { nom, prenom, pin, role, creatorSessionToken } = params;

        // Verify creator is admin (medecin)
        const { data: creatorSession } = await supabase
          .from('app_sessions')
          .select('*, app_users(*)')
          .eq('session_token', creatorSessionToken)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (!creatorSession || creatorSession.app_users?.role !== 'medecin') {
          return new Response(
            JSON.stringify({ error: 'Non autorisé. Seul un médecin peut créer des utilisateurs.' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate PIN format
        if (!/^\d{4,6}$/.test(pin)) {
          return new Response(
            JSON.stringify({ error: 'Le PIN doit contenir 4 à 6 chiffres' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Hash PIN and create user
        const pinHash = await hashPin(pin);
        const { data: newUser, error: createError } = await supabase
          .from('app_users')
          .insert({
            nom,
            prenom,
            pin_hash: pinHash,
            role: role || 'assistant'
          })
          .select()
          .single();

        if (createError) {
          console.error('User creation error:', createError);
          return new Response(
            JSON.stringify({ error: 'Erreur création utilisateur' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`User ${prenom} ${nom} created by ${creatorSession.app_users.prenom}`);

        return new Response(
          JSON.stringify({ 
            success: true,
            user: {
              id: newUser.id,
              nom: newUser.nom,
              prenom: newUser.prenom,
              role: newUser.role
            }
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_user': {
        const { userId, nom, prenom, role, is_active, creatorSessionToken } = params;

        // Verify creator is admin (medecin)
        const { data: creatorSession } = await supabase
          .from('app_sessions')
          .select('*, app_users(*)')
          .eq('session_token', creatorSessionToken)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (!creatorSession || creatorSession.app_users?.role !== 'medecin') {
          return new Response(
            JSON.stringify({ error: 'Non autorisé' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updateData: any = {};
        if (nom !== undefined) updateData.nom = nom;
        if (prenom !== undefined) updateData.prenom = prenom;
        if (role !== undefined) updateData.role = role;
        if (is_active !== undefined) updateData.is_active = is_active;

        const { error: updateError } = await supabase
          .from('app_users')
          .update(updateData)
          .eq('id', userId);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'Erreur mise à jour' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset_pin': {
        const { userId, newPin, creatorSessionToken } = params;

        // Verify creator is admin (medecin)
        const { data: creatorSession } = await supabase
          .from('app_sessions')
          .select('*, app_users(*)')
          .eq('session_token', creatorSessionToken)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (!creatorSession || creatorSession.app_users?.role !== 'medecin') {
          return new Response(
            JSON.stringify({ error: 'Non autorisé' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate PIN format
        if (!/^\d{4,6}$/.test(newPin)) {
          return new Response(
            JSON.stringify({ error: 'Le PIN doit contenir 4 à 6 chiffres' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const pinHash = await hashPin(newPin);
        const { error: updateError } = await supabase
          .from('app_users')
          .update({ 
            pin_hash: pinHash,
            failed_attempts: 0,
            locked_until: null
          })
          .eq('id', userId);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'Erreur réinitialisation PIN' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'setup_initial_admin': {
        // Check if any users exist
        const { data: existingUsers, error: countError } = await supabase
          .from('app_users')
          .select('id')
          .limit(1);

        if (countError) {
          return new Response(
            JSON.stringify({ error: 'Erreur vérification' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (existingUsers && existingUsers.length > 0) {
          return new Response(
            JSON.stringify({ error: 'Un administrateur existe déjà' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { nom, prenom, pin } = params;

        // Validate PIN format
        if (!/^\d{4,6}$/.test(pin)) {
          return new Response(
            JSON.stringify({ error: 'Le PIN doit contenir 4 à 6 chiffres' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Hash PIN and create admin user
        const pinHash = await hashPin(pin);
        const { data: newUser, error: createError } = await supabase
          .from('app_users')
          .insert({
            nom,
            prenom,
            pin_hash: pinHash,
            role: 'medecin'
          })
          .select()
          .single();

        if (createError) {
          console.error('Admin creation error:', createError);
          return new Response(
            JSON.stringify({ error: 'Erreur création administrateur' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Initial admin ${prenom} ${nom} created`);

        return new Response(
          JSON.stringify({ 
            success: true,
            user: {
              id: newUser.id,
              nom: newUser.nom,
              prenom: newUser.prenom,
              role: newUser.role
            }
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Action non reconnue' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Auth PIN error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});