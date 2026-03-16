

## Update Ali Hassan's PIN to 064064

The PIN is stored as a SHA-256 hash in the `app_users` table. The hash is computed server-side in the `auth-pin` Edge Function using `SHA-256(pin + salt)`.

Since I cannot call the Edge Function without a valid admin session token, the easiest approach is:

### Option A: Via the app UI (recommended)
1. Log in as the admin (medecin role) in the app
2. Go to **Parametres** > **Utilisateurs** tab
3. Click "Reset PIN" for Ali Hassan
4. Enter the new PIN: `064064`

### Option B: Direct database update (if you can't log in)
I would update the Edge Function temporarily or call it directly to hash and update the PIN. This requires:
1. Call the edge function with the `reset_pin` action using a valid admin session token
2. Or temporarily add a backdoor action to the edge function to reset without auth (then remove it)

### Recommendation
**Use Option A** -- log in as the admin user in the preview and reset Ali Hassan's PIN from the Parametres page. This is the secure, intended flow.

If you cannot log in as admin, approve this plan and I will temporarily modify the edge function to allow a one-time PIN reset for this user, then revert the change.

