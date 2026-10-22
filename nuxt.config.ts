export default defineNuxtConfig({
  compatibilityDate: '2026-10-15',
  devtools: { enabled: false },
  modules: ['nitro-cloudflare-dev'],
  css: ['~/assets/css/main.css'],
  typescript: { strict: true },
  nitro: { preset: 'cloudflare_module', cloudflare: { deployConfig: true, nodeCompat: true } },
  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      title: 'Остров открытий — полный доступ',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#FCFAF6' },
        {
          name: 'description',
          content:
            'Все игры и новые миры Острова открытий. Демонстрационный paywall без списания денег.',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/flower.svg' },
        {
          rel: 'preload',
          href: '/fonts/Nunito-Variable.ttf',
          as: 'font',
          type: 'font/ttf',
          crossorigin: '',
        },
      ],
    },
  },
})
