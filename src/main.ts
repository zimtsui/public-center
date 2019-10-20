import { pandora2Pm2 } from 'autonomous';
import { PublicCenter } from './index';
import { PandoraKita } from 'pandora-kita';

pandora2Pm2([
    PandoraKita,
    PublicCenter,
]);