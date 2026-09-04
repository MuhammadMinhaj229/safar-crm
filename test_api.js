async function test() {
  const res = await fetch('https://safar-crm-theta.vercel.app/api/public/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test', rating: '5', comments: 'test' })
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text);
}
test();
