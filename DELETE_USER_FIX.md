# Delete User Fix - HTTP 500 Error Resolution

## Problem Identified
The delete user endpoint was failing with HTTP 500 error because it tried to set `account_status = 'deleted'`, but the PostgreSQL enum `account_status_enum` only allows these values:
- `'active'`
- `'disabled'`
- `'locked'`

**Error Location:** `server/src/modules/admin/admin.routes.js` - DELETE `/admin/users/:id` endpoint

## Solution Applied
Changed the delete functionality to use `account_status = 'disabled'` instead of `'deleted'`.

### Changes Made:
1. Updated the UPDATE query to set `account_status = 'disabled'`
2. Added `anonymized: true` flag in the audit log to distinguish user deletion from regular disable actions
3. Updated the comment to reflect accurate behavior

### Modified Code:
```javascript
// Before (BROKEN):
account_status = 'deleted',  // ❌ Not a valid enum value!

// After (FIXED):
account_status = 'disabled',  // ✅ Valid enum value

// Audit log now includes:
JSON.stringify({ account_status: 'disabled', anonymized: true })
```

## How User Deletion Works (Soft Delete):
1. **Anonymizes PII:**
   - Email changed to: `deleted_{userId}@removed.invalid`
   - First name: `[Deleted]`
   - Last name: `[User]`
   - Display name: `[Deleted User]`

2. **Disables Account:**
   - Sets `account_status = 'disabled'`

3. **Revokes Sessions:**
   - All active sessions are immediately revoked

4. **Preserves Data:**
   - Manuscripts, reviews, assignments remain intact (for compliance)
   - Audit trail is maintained

5. **Audit Logging:**
   - Records the action with `anonymized: true` flag
   - Tracks who performed the deletion and when

## Testing Instructions

### 1. Restart the Server
```bash
cd server
npm run dev
# or
node src/index.js
```

### 2. Test Delete Functionality
1. Open the admin panel at `http://localhost:5173/admin/users`
2. Click "Manage" on any user (not yourself)
3. Go to "Delete User" tab
4. Type "DELETE" to confirm
5. Click "Permanently Delete User"

### 3. Expected Results:
- ✅ User is deleted successfully
- ✅ Success message appears
- ✅ User list refreshes
- ✅ User's account_status is now 'disabled'
- ✅ User's email is changed to `deleted_{id}@removed.invalid`
- ✅ All sessions are revoked

### 4. Verify in Database:
```sql
-- Check deleted user
SELECT id, email, account_status, display_name 
FROM users 
WHERE email LIKE 'deleted_%@removed.invalid';

-- Check audit log
SELECT * FROM audit_logs 
WHERE action = 'user_deleted' 
ORDER BY created_at DESC 
LIMIT 1;
```

## Files Modified
- ✅ `server/src/modules/admin/admin.routes.js`

## Database Schema Reference
**Enum Definition:** `server/src/db/migrations/0000_create_enums.sql`
```sql
CREATE TYPE account_status_enum AS ENUM ('active', 'disabled', 'locked');
```

## Notes
- If you need a true 'deleted' status, you would need to:
  1. Add 'deleted' to the enum in a new migration
  2. Update the existing enum: `ALTER TYPE account_status_enum ADD VALUE 'deleted';`
  3. However, using 'disabled' with the `anonymized` flag is the recommended approach
