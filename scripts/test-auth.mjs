const rand = Math.random().toString(36).slice(2, 8);
const email = `test_${rand}@test.com`;

// 1. Register
const regRes = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Test User', email, dateOfBirth: '2000-01-01', password: 'testtest123' }),
});
console.log('Register status:', regRes.status);
const regData = await regRes.json();
console.log('Register body:', JSON.stringify(regData));

const setCookies = regRes.headers.getSetCookie();
const authCookie = setCookies.find(c => c.startsWith('auth-token='));
console.log('Auth cookie set:', !!authCookie);

if (authCookie) {
  const tokenValue = authCookie.split('=')[1].split(';')[0];
  console.log('Token format ok (v1.):', tokenValue.startsWith('v1.'));

  // 2. Verify
  const verifyRes = await fetch('http://localhost:3000/api/auth/verify', {
    headers: { Cookie: `auth-token=${tokenValue}` },
  });
  console.log('Verify status:', verifyRes.status);
  console.log('Verify body:', JSON.stringify(await verifyRes.json()));

  // 3. 2FA setup
  const setupRes = await fetch('http://localhost:3000/api/auth/2fa/setup', {
    method: 'POST',
    headers: { Cookie: `auth-token=${tokenValue}` },
  });
  console.log('2FA setup status:', setupRes.status);
  console.log('2FA setup content-type:', setupRes.headers.get('content-type'));
  const setupText = await setupRes.text();
  console.log('Full body (first 2000 chars):', setupText.substring(0, 2000));
  // Try to extract error from Next.js HTML
  const errMatch = setupText.match(/"message":"([^"]+)"/);
  if (errMatch) console.log('Error message:', errMatch[1]);
  const stackMatch = setupText.match(/"stack":"([^"]{0,500})"/);
  if (stackMatch) console.log('Stack:', stackMatch[1]);
  // If short enough, print full body
  if (setupText.length < 500) console.log('Full body:', setupText);
  if (setupText.length > 500) {
    console.log('Body length:', setupText.length);
    // Try to find error info in HTML
    const digestMatch = setupText.match(/digest['":\s]+([^<"']+)/i);
    if (digestMatch) console.log('Digest:', digestMatch[1]);
    // Look for server error details
    const descMatch = setupText.match(/"description":"([^"]+)"/);
    if (descMatch) console.log('Description:', descMatch[1]);
  }
}
