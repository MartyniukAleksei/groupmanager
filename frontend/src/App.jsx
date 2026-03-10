import { useState, useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

function App() {
  // Стан для зберігання даних користувача
  const [user, setUser] = useState(null);

  // Перевіряємо пам'ять браузера при першому завантаженні сайту
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    // Якщо токен і дані є, автоматично "логінимо" користувача
    if (savedToken && savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Функція обробки успішного входу
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/google`,
        {
          token: credentialResponse.credential,
        },
      );

      const userData = response.data.user;
      const accessToken = response.data.access_token;

      // 1. Зберігаємо токен і дані юзера у localStorage (щоб не зникли при оновленні сторінки)
      localStorage.setItem("token", accessToken);
      localStorage.setItem("user", JSON.stringify(userData));

      // 2. Оновлюємо стан React, щоб екран миттєво змінився
      setUser(userData);
    } catch (error) {
      console.error("Помилка авторизації:", error);
      alert("Не вдалося увійти. Перевірте консоль.");
    }
  };

  // Функція виходу з акаунту
  const handleLogout = () => {
    // Очищаємо пам'ять і скидаємо стан
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <div
      style={{ padding: "50px", textAlign: "center", fontFamily: "sans-serif" }}
    >
      {/* УМОВНИЙ РЕНДЕР: Якщо user є, показуємо дашборд. Якщо ні - кнопку входу */}
      {user ? (
        // --- ЕКРАН ДАШБОРДУ (Авторизований стан) ---
        <div>
          <h1>Group Manager</h1>
          <h2>Привіт, {user.name}! 👋</h2>
          <p>
            Твій email: <b>{user.email}</b>
          </p>

          <div
            style={{
              marginTop: "30px",
              padding: "20px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              display: "inline-block",
            }}
          >
            <p>Тут буде список твоїх груп та панель керування.</p>
          </div>

          <br />
          <button
            onClick={handleLogout}
            style={{
              marginTop: "30px",
              padding: "10px 20px",
              cursor: "pointer",
              background: "#ff4d4f",
              color: "white",
              border: "none",
              borderRadius: "5px",
            }}
          >
            Вийти з акаунту
          </button>
        </div>
      ) : (
        // --- ЕКРАН ЛОГІНУ (Неавторизований стан) ---
        <div>
          <h1>Group Manager</h1>
          <p>Увійдіть, щоб керувати групами</p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "20px",
            }}
          >
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => console.log("Помилка при вході через Google")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
