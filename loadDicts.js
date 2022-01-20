const files = [
    {
        name: 'grammemes.json',
        responseType: 'json',
    },
    {
        name: 'gramtab-opencorpora-ext.json',
        responseType: 'json',
    },
    {
        name: 'gramtab-opencorpora-int.json',
        responseType: 'json',
    },
    {
        name: 'meta.json',
        responseType: 'json',
    },
    {
        name: 'p_t_given_w.intdawg',
        responseType: 'arrayBuffer',
    },
    {
        name: 'paradigms.array',
        responseType: 'arrayBuffer',
    },
    {
        name: 'prediction-suffixes-0.dawg',
        responseType: 'arrayBuffer',
    },
    {
        name: 'prediction-suffixes-1.dawg',
        responseType: 'arrayBuffer',
    },
    {
        name: 'prediction-suffixes-2.dawg',
        responseType: 'arrayBuffer',
    },
    {
        name: 'suffixes.json',
        responseType: 'json',
    },
    {
        name: 'words.dawg',
        responseType: 'arrayBuffer',
    },
];

export function loadDicts(dir, callback) {
    Promise.all(files.map(({ name, responseType }) => (
        fetch(`${dir}/${name}`).then((res) => res[responseType](),
    )))).then((data) => {
        callback(
            files.reduce((obj, fileName, index) => (
                {
                    ...obj,
                    [fileName.name]: data[index],
                }
            ), {})
        );
    });
}
