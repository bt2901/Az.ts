const path = require('path');

module.exports = {
    mode: 'production', // or 'production' for minified output
    entry: './dist/index.js', // Specify the entry point of your application
    experiments: {
        outputModule: true
    },
    output: {
        filename: '../demo/dist/azbundle.js', // Name of the bundled file
        path: path.resolve(__dirname, 'dist'), // Output directory
        library: {
            type: 'umd',
            umdNamedDefine: true,
        },
        libraryTarget: 'module',
    },
};
