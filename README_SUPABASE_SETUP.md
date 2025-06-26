
# Supabase Database Setup

This document explains how to set up your Supabase database for the Quotation App.

## Quick Setup

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/project/mxkxkydeluflivpfnyhf

2. **Navigate to SQL Editor** in the left sidebar

3. **Run the migration files in order**:
   - First: `supabase/migrations/001_initial_schema.sql`
   - Second: `supabase/migrations/002_rls_policies.sql` 
   - Optional: `supabase/migrations/003_seed_data.sql`

## What These Scripts Do

### 001_initial_schema.sql
- Creates all required tables: `profiles`, `customers`, `quotations`, `quotation_items`
- Sets up proper foreign key relationships
- Adds indexes for better performance
- Creates automatic timestamp triggers

### 002_rls_policies.sql
- Enables Row Level Security (RLS) on all tables
- Creates policies to ensure users can only access their own data
- Secures the application against unauthorized data access

### 003_seed_data.sql
- Optional test data for development
- Uncomment and modify as needed for testing

## Security Features

✅ **Row Level Security**: Users can only see/modify their own data
✅ **Foreign Key Constraints**: Data integrity is maintained
✅ **Input Validation**: Status fields have CHECK constraints
✅ **Automatic Timestamps**: Created/updated timestamps are handled automatically

## After Setup

Once you've run these scripts, your app will be fully functional with:
- User authentication
- Customer management
- Quotation creation and management
- Secure data access

## Troubleshooting

If you encounter any issues:
1. Make sure you're logged into the correct Supabase project
2. Check that RLS is enabled on all tables
3. Verify that the policies are created correctly
4. Test with a new user account to ensure policies work

## Next Steps

After setting up the database:
1. Test user registration/login
2. Create a test customer
3. Generate your first quotation
4. Verify that users can only see their own data
