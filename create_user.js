require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createTempUser() {
  const email = 'reviewer@safarmanzil.com';
  const password = 'ReviewerPassword123!';

  // First try to find existing
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  
  if (!listError && usersData?.users) {
      const existingUser = usersData.users.find(u => u.email === email);
      if (existingUser) {
          console.log(`User ${email} already exists. Updating password...`);
          await supabase.auth.admin.updateUserById(existingUser.id, { password });
          console.log(`Password updated. You can use:\nEmail: ${email}\nPassword: ${password}`);
          return;
      }
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  });

  if (error) {
    console.error('Error creating user:', error);
    return;
  }
  
  console.log(`Successfully created user.\nEmail: ${email}\nPassword: ${password}`);
}

createTempUser();
