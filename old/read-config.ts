import { Config } from './interfaces';
import { parse } from 'url';
import { join, dirname } from 'path';
import fse from 'fs-extra';
const { readJsonSync } = fse;

function readConfig(): Config {
    return readJsonSync(join(
        dirname(parse(import.meta.url).pathname!),
        '../cfg/config.json'
    ));
}

export {
    readConfig as default,
    readConfig,
}