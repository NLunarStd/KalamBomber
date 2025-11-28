const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = 3000;

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL server:', err);
        return;
    }
    console.log('Connected to MySQL server success');

    // ทำการเริ่มต้นฐานข้อมูล
    initDatabase(); 
});


function initDatabase() {
    //สร้าง Database ถ้ายังไม่มี
    db.query("CREATE DATABASE IF NOT EXISTS kalam_bomber_db", (err) => {
        if (err) throw err;
        
    // เลือกใช้ Database นี้
    db.changeUser({ database: 'kalam_bomber_db' }, (err) => {
        if (err) throw err;
        console.log('select "kalam_bomber_db" ');

    // จากนั้นสร้างตารางต่างๆ 
        createTables();
    });
    });
}

// สำหรับสร้างตารางต่างๆ
function createTables() {
    // สร้างตาราง User 
    const userTable = `
        CREATE TABLE IF NOT EXISTS user (
            userID VARCHAR(10) NOT NULL,
            userName VARCHAR(30) NOT NULL,
            password VARCHAR(12) NOT NULL,
            PRIMARY KEY (userID)
        )
    `;

    db.query(userTable, (err) => {
        if (err) throw err;

    // สร้างตาราง Score 
    const scoreTable = `
        CREATE TABLE IF NOT EXISTS score (
            user_scoreID VARCHAR(10) NOT NULL,
            userID VARCHAR(10) NOT NULL,
            score_value INT(10) NOT NULL,
            score_timeStamp DATETIME NOT NULL,
            like_amount INT(6) DEFAULT 0,
            log_data TEXT,
            PRIMARY KEY (user_scoreID),
            FOREIGN KEY (userID) REFERENCES user(userID) ON DELETE CASCADE
        )
    `;

    db.query(scoreTable, (err) => {
    if (err) throw err;

    //สร้างตาราง Comment
    const commentTable = `
        CREATE TABLE IF NOT EXISTS comment (
            commentID VARCHAR(10) NOT NULL,
            userID VARCHAR(10) NOT NULL,
            user_scoreID VARCHAR(10) NOT NULL,
            commentText VARCHAR(300),
            comment_timeStamp DATETIME NOT NULL,
            PRIMARY KEY (commentID),
            FOREIGN KEY (userID) REFERENCES user(userID) ON DELETE CASCADE,
            FOREIGN KEY (user_scoreID) REFERENCES score(user_scoreID) ON DELETE CASCADE
        )
    `;

    db.query(commentTable, (err) => {
        if (err) throw err;

    // สร้างตาราง Like Log
        const likeLogTable = `
    CREATE TABLE IF NOT EXISTS like_log (
        userID VARCHAR(10) NOT NULL,
        user_scoreID VARCHAR(10) NOT NULL,
        PRIMARY KEY (userID, user_scoreID), -- Composite Key ป้องกันซ้ำ
        FOREIGN KEY (userID) REFERENCES user(userID) ON DELETE CASCADE,
        FOREIGN KEY (user_scoreID) REFERENCES score(user_scoreID) ON DELETE CASCADE
    )
`;

    db.query(likeLogTable, (err) => {
        if (err) throw err;
        console.log('สร้างตารางทั้งหมดแล้ว');
    });
        
    });
});    
});
}


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ฟังก์ชันสุ่ม ID 10 ตัวอักษร
function generateID() {
    return crypto.randomBytes(5).toString('hex').toUpperCase();
}



app.post('/register', (req, res) => {

    const { username, password, repassword } = req.body;
    
    if (password !== repassword) 
    {
        // ถ้ารหัสผ่านไม่ตรงกัน ให้ Redirect กลับไปหน้า register พร้อม error
        return res.redirect('/html/register.html?error=mismatch');
    }
    db.query("SELECT * FROM user WHERE userName = ?", [username], (err, result) => {
    if (err) 
    {
        return res.redirect('/html/register.html?error=1');
    }
    // ถ้าพบว่ามี username นี้อยู่แล้ว
    if (result.length > 0) 
    {
        return res.redirect('/html/register.html?error=exists');
    }
        const newUserID = generateID();
        db.query("INSERT INTO user (userID, userName, password) VALUES (?, ?, ?)", 
            [newUserID, username, password], (err) => {
            if (err) return res.redirect('/html/register.html?error=1');
            res.redirect('/html/login.html?success=true');
        });
    });
});

// Login
app.post('/checkLogin', (req, res) => {
    const { username, password } = req.body;
    db.query("SELECT * FROM user WHERE userName = ? AND password = ?", [username, password], (err, result) => {
     // ถ้า err หรือ หา user ไม่เจอ    
    if (err || result.length === 0) 
    {
        return res.redirect('/html/login.html?error=invalid');
        // ส่งกลับไปหน้า login พร้อม error
    }
        // ถ้าผ่าน ให้ตั้ง Cookie แล้วไปที่ mainmenu.html
        res.cookie('username', username, { maxAge: 2000000 });
        res.redirect('/html/mainmenu.html');
    });
});

//Save Score 
app.post('/saveScore', (req, res) => {
    const username = req.cookies.username;
    const { score } = req.body;
    //รับมาจาก script.js

    // เช็ค หา userID จาก username 
    db.query("SELECT userID FROM user WHERE userName = ?", [username], (err, users) => {
        if (err || users.length === 0)
        {
            return res.status(500);
            // ถ้าไม่เจอ user ให้ส่ง error กลับไป
        }  
        const userID = users[0].userID;
        const scoreID = generateID();
        const timeStamp = new Date();
        // สร้าง ID และ timestamp ใหม่
        // แล้วทำการบันทึกลงตาราง score
        const sql = `INSERT INTO score (user_scoreID, userID, score_value, score_timeStamp, like_amount, log_data) 
                     VALUES (?, ?, ?, ?, 0, 'Game Finished')`;
        
        db.query(sql, [scoreID, userID, score, timeStamp], (err) => {
        if (err) 
        {
            return res.status(500);
        }

        });
    });
});

//Leaderboard
app.get('/leaderboard', (req, res) => {
    const currentUsername = req.cookies.username;
    // รับ username มาเพื่อแสดงข้อมูลผู้เล่นปัจจุบัน

    const topQuery = `
        SELECT s.user_scoreID, u.userName, s.score_value, s.like_amount,
        (SELECT COUNT(*) FROM comment c WHERE c.user_scoreID = s.user_scoreID) as comment_count
        FROM score s
        JOIN user u ON s.userID = u.userID
        ORDER BY s.score_value DESC
        LIMIT 5
    `;

    // ดึงข้อมูล Top 5 ออกมา
    db.query(topQuery, (err, topResults) => {
        if (err) 
        {
            
        }

        //  ผลลัพธ์ออกมาจาก format 
        // เพื่อกรณี user ปัจจุบันไม่มีคะแนนเลย
        // ให้แสดงเป็นคา่ N/A แทน
        let userResult = { rank: 'N/A', username: currentUsername, score: '-', likes: 0, comment_count: 0, id: null };


        if (currentUsername) {
            // ดึงข้อมูล User ปัจจุบัน
            // หาคะแนนสูงสุดของ user นี้
            const userScoreQuery = `
                SELECT s.user_scoreID, s.score_value, s.like_amount,
                (SELECT COUNT(*) FROM comment c WHERE c.user_scoreID = s.user_scoreID) as comment_count
                FROM score s
                JOIN user u ON s.userID = u.userID
                WHERE u.userName = ?
                ORDER BY s.score_value DESC LIMIT 1
            `;

            db.query(userScoreQuery, [currentUsername], (err, uRes) => {
                if (!err && uRes.length > 0) {
                    // ถ้าเจอข้อมูลคะแนนของ user นี้ และ ไม่ error
                    const myData = uRes[0];
                    // ใช้ตัวแรก เพราะ ดึงมากสุดมาแล้ว

                    // จากนั้นหาลำดับ rank
                    // ใช้การหาว่ามีคะแนนไหนได้คะแนนมากกว่า
                    const rankQuery = "SELECT COUNT(*) as rank FROM score WHERE score_value > ?";
                    db.query(rankQuery, [myData.score_value], (err, rRes) => {
                        userResult = {
                            // rank ที่ได้จะเท่ากับ ที่ query นับได้ + 1
                            rank: rRes[0].rank + 1,
                            username: currentUsername,
                            score: myData.score_value,
                            likes: myData.like_amount,
                            comment_count: myData.comment_count,
                            id: myData.user_scoreID
                        };
                        // ส่ง ที่ดึง top 5 กับ userResult กลับไป
                        res.json({ top5: topResults, user: userResult });
                    });
                } 
                else 
                {
                    // กรณีไม่มีคะแนนของ user นี้ก็ส่งค่า default ไป
                    res.json({ top5: topResults, user: userResult });
                }
            });
        } 
        else 
        {
            // กรณียังไม่ได้เล่นแล้วไม่มีคะแนนเลย
            // ส่งค่า default ไป
            res.json({ top5: topResults, user: userResult });
        }
    });
});

// like
app.post('/like', (req, res) => {
    const { scoreId } = req.body;
    const username = req.cookies.username;
    // รับ scoreId กับ username มาจาก cookie
    
    // query หา userID จาก username
    db.query("SELECT userID FROM user WHERE userName = ?", [username], (err, users) => {
        if (err || users.length === 0) 
        {
            // ถ้าไม่เจอ user
            return res.status(404).json({ error: 'user not found' });
        }

        // ถ้าเจอ
        const userID = users[0].userID;

        const sqlInsert = "INSERT INTO like_log (userID, user_scoreID) VALUES (?, ?)";
        
        db.query(sqlInsert, [userID, scoreId], (err) => {
            if (err) {

                // ถ้า Error แปลว่าน่าจะเคยกดไปแล้ว 
                // จากที่ทำเป็น Primary Key คู่กัน
                return res.status(400).json({ error: 'already liked this score!' });
            }

            // ถ้าเพิ่มสำเร็จ ให้เพิ่ม like_amount ในตาราง score 1 หน่วย
            db.query("UPDATE score SET like_amount = like_amount + 1 WHERE user_scoreID = ?", [scoreId], (updateErr) => {
                if (updateErr) 
                {
                
                }
                // ส่งกลับ success
                res.json({ success: true });
            });
        });
    });
});

// Comment
app.get('/comments/:scoreId', (req, res) => {
    // รับ scoreId มาจากพารามิเตอร์
    // เพื่อดึงคอมเมนต์ทั้งหมดของ scoreId 
    const query = `
        SELECT u.userName, c.commentText, c.comment_timeStamp 
        FROM comment c
        JOIN user u ON c.userID = u.userID
        WHERE c.user_scoreID = ? 
        ORDER BY c.comment_timeStamp ASC
    `;
    db.query(query, [req.params.scoreId], (err, results) => {
    if (err)
    {

    }
    // ส่งผลลัพธ์กลับ 
    res.json(results);
    });
});

app.post('/comment', (req, res) => {
    const { scoreId, message } = req.body;
    const username = req.cookies.username;
    // จาก sendComment ใน leaderboard.js
    
    db.query("SELECT userID FROM user WHERE userName = ?", [username], (err, users) => {
        if (err || users.length === 0) 
        {
            // ถ้าerror หรือ หา user ไม่เจอ
            return res.status(500).json({ error: 'User not found' });
        }

        const userID = users[0].userID;
        const commentID = generateID();
        const timeStamp = new Date();

        const sql = "INSERT INTO comment (commentID, userID, user_scoreID, commentText, comment_timeStamp) VALUES (?, ?, ?, ?, ?)";
        db.query(sql, [commentID, userID, scoreId, message, timeStamp], (err) => {
        if (err) 
        {

        }
        // ถ้าเจอและเพิ่มสำเร็จ
        // ส่งกลับ success
        res.json({ success: true });
        });
    });
});

// Logout
app.post('/logout', (req, res) => {
    res.clearCookie('username');
    res.send('Logged out');
});

// ให้หน้าแรกไปที่ index.htmlในโฟลเดอร์ public/html
app.get('/', (req, res) => {
    res.redirect('/html/index.html');
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});