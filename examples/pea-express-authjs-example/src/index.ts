import './env';
import app from './auth.route';
import * as ejs from 'ejs';

const port = app.get('port') ?? 3000;
const __dirname = new URL('.', import.meta.url).pathname;

app.set('view engine', 'ejs');
app.engine('ejs', (ejs as any).__express);
app.set('views', __dirname + '/../views');
app.get('/', function (req, res) {
    res.render('index');
});

// about page
app.get('/login', function (req, res) {
    res.render('login');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}\n http://localhost:${port}`);
})