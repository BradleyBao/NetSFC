const IS_LOCAL = [
    'localhost',
    '127.0.0.1',
    '::1'
].includes(window.location.hostname);

window.ENV = {
    API_HOST: IS_LOCAL
        ? "http://localhost:8080"
        : "https://netsfc-api.tianyibrad.com"
};