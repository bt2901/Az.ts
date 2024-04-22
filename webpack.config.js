const path = require('path');

module.exports = {
    mode: 'development', // or 'production' for minified output
    entry: './dist/index.js', // Specify the entry point of your application
    output: {
        filename: '../demo/dist/azbundle.js', // Name of the bundled file
        path: path.resolve(__dirname, 'dist'), // Output directory
        library: {
            name: 'AzModule',
            type: 'umd',
        },
    },
};
