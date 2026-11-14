import {brandMediaURL} from '../../public/brand-media.js';
import { adminIdentity } from '../../lib/cms/auth';
import { chatGPTSignInPath } from '../chatgpt-auth';
import Admin from './studio';
export const dynamic='force-dynamic';
export default async function AdminPage(){const user=await adminIdentity();return user?<Admin name={user.displayName}/>:<main className="login"><img src={brandMediaURL('/assets/logo-black.png')} alt="UTRO"/><h1>Редактор сайта</h1><p>Вход доступен владельцу этого сайта через ChatGPT.</p><a href={chatGPTSignInPath('/admin')} target="_top">Войти через ChatGPT →</a><a className="quiet" href="/">Вернуться на сайт</a></main>;}
