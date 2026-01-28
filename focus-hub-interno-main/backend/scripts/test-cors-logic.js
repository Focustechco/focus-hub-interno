const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', 'https://focus-hub.vercel.app'];

const checkOrigin = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
        return true;
    }
    return false;
};

console.log('Testing CORS Logic:');
console.log('1. http://localhost:5173 (Allowed):', checkOrigin('http://localhost:5173'));
console.log('2. https://focus-hub.vercel.app (Allowed):', checkOrigin('https://focus-hub.vercel.app'));
console.log('3. https://focus-hub-git-branch-user.vercel.app (Preview - Allowed):', checkOrigin('https://focus-hub-git-branch-user.vercel.app'));
console.log('4. https://evil-site.com (Blocked):', !checkOrigin('https://evil-site.com'));
console.log('5. https://fake-vercel.app.com (Blocked):', !checkOrigin('https://fake-vercel.app.com'));

if (
    checkOrigin('http://localhost:5173') &&
    checkOrigin('https://focus-hub.vercel.app') &&
    checkOrigin('https://focus-hub-git-branch-user.vercel.app') &&
    !checkOrigin('https://evil-site.com') &&
    !checkOrigin('https://fake-vercel.app.com')
) {
    console.log('\nSUCCESS: All CORS tests passed!');
} else {
    console.error('\nFAILURE: Some CORS tests failed.');
    process.exit(1);
}
