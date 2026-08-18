export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="w-full max-w-xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Jobs App
        </h1>
        <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Pega tu CV, mira las ofertas de empleo remoto que encajan contigo y
          descarga un CV y una carta adaptados a cada una.
        </p>
        <p className="mt-10 text-sm text-zinc-500 dark:text-zinc-500">
          En construcción.
        </p>
      </main>
    </div>
  );
}
