// Cambia el email demo a @arcauctions.com
demoBtn.onclick = async () => {
  const demoUser = await loginUser("demo@arcauctions.com", "123456");
  if (demoUser) window.location.href = '/dashboard.html';
};
