<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h1 class="text-2xl font-bold text-white border-l-4 border-indigo-500 pl-4 mb-8">
      田园犬的狗窝
    </h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <!-- Game -->
      <NuxtLink to="/game/"
        class="group block bg-gray-800 border border-gray-700/50 hover:border-indigo-500/50 rounded-lg p-6 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 hover:scale-[1.02]"
      >
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center text-2xl">
            🎮
          </div>
          <div>
            <h2 class="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">游戏</h2>
            <p class="text-gray-500 text-sm mt-1">视觉小说 & 游戏收藏与评测</p>
          </div>
        </div>
      </NuxtLink>

      <!-- Novel (placeholder) -->
      <div
        class="block bg-gray-800/50 border border-gray-700/30 rounded-lg p-6 opacity-60 cursor-not-allowed"
      >
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-2xl">
            📖
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-400">小说</h2>
            <p class="text-gray-600 text-sm mt-1">即将推出</p>
          </div>
        </div>
      </div>

      <!-- Artist (placeholder) -->
      <div
        class="block bg-gray-800/50 border border-gray-700/30 rounded-lg p-6 opacity-60 cursor-not-allowed"
      >
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-2xl">
            🎨
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-400">画师</h2>
            <p class="text-gray-600 text-sm mt-1">即将推出</p>
          </div>
        </div>
      </div>

      <!-- OC (placeholder) -->
      <div
        class="block bg-gray-800/50 border border-gray-700/30 rounded-lg p-6 opacity-60 cursor-not-allowed"
      >
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-2xl">
            🧬
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-400">OC</h2>
            <p class="text-gray-600 text-sm mt-1">即将推出</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
