import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

function App() {
  // Функція, яка спрацює після успішного входу в Google
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // Відправляємо токен від Google на наш бекенд
      const response = await axios.post("http://localhost:8000/auth/google", {
        token: credentialResponse.credential,
      });

      console.log("Бекенд відповів:", response.data);
      // Тут ми отримаємо наш access_token і дані юзера!
      // Зберігаємо їх (наприклад, в localStorage)
      localStorage.setItem("token", response.data.access_token);
      alert(`Вітаємо, ${response.data.user.name}!`);
    } catch (error) {
      console.error("Помилка авторизації:", error);
    }
  };

  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h1>Projects Hub</h1>
      <p>Увійдіть, щоб керувати групами</p>

      {/* Чарівна кнопка Google */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => {
            console.log("Помилка при вході через Google");
          }}
        />
      </div>
    </div>
  );
}

export default App;
