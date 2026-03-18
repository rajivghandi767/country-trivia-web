import Game from "./components/Game";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

function App() {
  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex flex-col font-sans text-brand-light dark:text-brand-dark transition-colors duration-200">
      <Header />
      <main className="container mx-auto p-4 grow">
        <Game />
      </main>
      <Footer />
    </div>
  );
}

export default App;
