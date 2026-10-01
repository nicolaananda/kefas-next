export const API_BASE_URL: string =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? 'https://api.kefasbarbershop.id/api' : '/api');

export const UPLOADS_BASE_URL: string = import.meta.env.PROD
    ? API_BASE_URL.replace(/\/api$/, '')
    : '';
