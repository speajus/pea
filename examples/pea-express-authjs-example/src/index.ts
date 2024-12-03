import './env';
import app from './auth.route';
import * as ejs from 'ejs';
import { context, pea } from '@speajus/pea/context';
import { sessionPeaKey, userPeaKey } from './pea';
import { asyncLocalStorage } from './junkasync';

const port = app.get('port') ?? 3000;
const __dirname = new URL('.', import.meta.url).pathname;

app.set('view engine', 'ejs');
app.engine('ejs', (ejs as any).__express);
app.set('views', __dirname + '/../views');
app.get('/', function (req, res) {

    res.render('index', { pea: pea(sessionPeaKey) });
});

// about page


app.listen(port, () => {
    console.log(`Server is running on port ${port}\n http://localhost:${port}`);
})  