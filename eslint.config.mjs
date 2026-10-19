import nextVitals from 'eslint-config-next/core-web-vitals';
const config = [...nextVitals,
  { settings: { next: { rootDir: 'apps/web/' } } },
  { ignores: ['.local/**','android/**','apps/web/.next/**','apps/web/out/**','node_modules/**','docs/requirements/**','test-results/**','playwright-report/**'] }
];
export default config;

