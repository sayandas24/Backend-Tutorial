import { useEffect, useState } from "react"; 
import "./App.css";
import axios from "axios";

function App() {
  const [jokes, setJokes] = useState([]);

  useEffect(() => {
    axios
      .get("/api/jokes")
      .then((res) => {
        setJokes(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  return (
    <>
      <h1>Chai Aur FullStack</h1>
      <h2>Jokes: {jokes.length}</h2>

      {jokes.map((joke, index) => {
        return (
          <div key={joke.id}>
            <h2>{joke.title}</h2>
            <h3>{joke.content}</h3>
          </div>
        );
      })}
    </>
  );
}

export default App;
