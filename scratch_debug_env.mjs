
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('STRIPE_SECRET_KEY_LIVE:', process.env.STRIPE_SECRET_KEY_LIVE ? 'Present' : 'Missing');
console.log('STRIPE_SECRET_KEY_TEST:', process.env.STRIPE_SECRET_KEY_TEST ? 'Present' : 'Missing');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Present' : 'Missing');
