import { Config } from '@tact-lang/compiler';

const config: Config = {
    projects: [
        {
            name: 'NftItem',
            path: './NftItem.tact',
            output: './build',
            options: {
                debug: false,
            },
        },
        {
            name: 'NftCollection',
            path: './NftCollection.tact',
            output: './build',
            options: {
                debug: false,
            },
        },
    ],
};

export default config;
