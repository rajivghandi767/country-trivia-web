import Game from "./components/Game";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

function App() {
  return (
    <div className="min-h-screen m-auto font-mono flex flex-col">
      <Header />
      <main className="container mx-auto p-4 grow">
        <Game />
      </main>
      <Footer />
    </div>
  );
}

export default App;
