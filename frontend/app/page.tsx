import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between pt-16">
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          ChainLease
        </h1>
        <p className="text-2xl text-gray-700 dark:text-gray-300 mb-4">
          Decentralized Real Estate Platform
        </p>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
          Smart contracts for seamless property leasing
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Link href="/properties">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
              Browse Properties
            </button>
          </Link>
          <Link href="/list-property">
            <button className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 dark:hover:bg-gray-800 transition">
              List Property
            </button>
          </Link>
        </div>
        
        <Link href="/verify">
          <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition flex items-center gap-2">
            <span>🌍</span>
            Verify with World ID
          </button>
        </Link>
      </div>

      <footer className="w-full text-center py-6 text-sm text-gray-500">
        Built with Next.js • RainbowKit • Wagmi • World ID
      </footer>
    </main>
  )
}
