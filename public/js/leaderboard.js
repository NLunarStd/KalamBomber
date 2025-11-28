let currentOpenScoreId = null;
let myUsername = ""; 

window.onload = function() {

    // อ่านชื่อ User จาก Cookie เพื่อใช้แยกฝั่งแชท 
    myUsername = getCookie("username");
    
    // โหลดข้อมูล Leaderboard ทันทีที่เข้าหน้าเว็บ
    loadLeaderboard();
    
    //เพิ่มให้กด Enter เพื่อส่งคอมเมนต์ได้
    const commentInput = document.getElementById('comment-input');
    if (commentInput) {
        commentInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                sendComment();
            }
        });
    }
        
    document.getElementById('leaderboard-body').addEventListener('click', function(e) {
        
        // เช็คว่าคลิกที่ปุ่มไหน
        // ถ้าเป็นปุ่ม like
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            const scoreId = likeBtn.dataset.scoreId; // ดึง Id จาก data-score-id
            // แล้วเรียกฟังก์ชันกดไลค์
            likeScore(scoreId); 
            return;
        }

        // ถ้าเป็นปุ่ม comment
        const commentBtn = e.target.closest('.comment-btn');
        if (commentBtn) {
            const scoreId = commentBtn.dataset.scoreId; // เหมือนกันดึงจาก Id
            // แล้วเปิด Overlay คอมเมนต์
            openCommentOverlay(scoreId);
            return;
        }
    });
};

function getCookie(name){
    var value = "";
    try{
        value = document.cookie.split("; ").find(row => row.startsWith(name)).split('=')[1]
        return value
    }catch(err){
        return false
    } 
}

function loadLeaderboard() {
    fetch('/leaderboard')
        .then(res => res.json())
        .then(data => {

            //  รับกลับมาจากมาจาก server.js 
            const tbody = document.getElementById('leaderboard-body');
            const userRow = document.getElementById('user-rank-display');
            tbody.innerHTML = ""; // ล้างข้อมูลเก่า

            // สร้างแถวสำหรับ Top 5
            data.top5.forEach((player, index) => {
                const tr = document.createElement('tr');
                
                // สร้างตาม rank userName, score_value, like_amount, user_scoreID
                tr.innerHTML = `
                <td>${index + 1}</td> 
                <td>${player.userName}</td>
                <td>${player.score_value}</td>
                <td>
                    <button class="action-btn like-btn" data-score-id="${player.user_scoreID}">
                        <span class="icon">👍</span> 
                        <span class="count">${player.like_amount}</span>
                    </button>
                </td>
                <td>
                    <button class="action-btn comment-btn" data-score-id="${player.user_scoreID}">
                        <span class="icon">💬</span> 
                        <span class="count">${player.comment_count}</span>
                    </button>
                </td>
                `;
                tbody.appendChild(tr);

                // ถึงคุณโปรเกรสถ้ามาอ่านตรงนี้
                // แล้วจะเปลี่ยน icon ปุ่ม like กับ comment เป็นรูปภาพแทนไอคอน
                // ให้เปลี่ยนจาก <span class="icon">👍</span> เป็น <img src="../images/like_icon.png" alt="Like" class="icon-img">
                // และอย่างลืมเอาชื่อที่ตรงกันใส่ด้วยครับ
                // เช่นเดียวกับ comment



            });

            // ส่วนแสดง high score ของ ผู้เล่นที่ใช้งาน
            const user = data.user;
            
            let displayRank
            let displayScore

            // กรณีไม่มีคะแนนว
            if(user.rank === 'N/A') 
            {
                displayRank = 'N/A';
                displayScore = 'N/A';
            }
            else
            {
                // กรณีมีคะแนน
                displayRank = user.rank;
                displayScore = user.score;
            }
           
            
            userRow.innerHTML = `
                <span>${displayRank}</span>
                <span>${user.username} (You)</span>
                <span>${displayScore}</span>
                <span>👍 ${user.likes}</span>
                <span>💬 ${user.comment_count}</span>
            `;
        })
}



function likeScore(scoreId) {
    fetch('/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoreId: scoreId })
    })
    .then(res => res.json()) // อ่าน json ก่อน
    .then(data => {
    if(data.success) 
    {
        // ถ้าไลค์สำเร็จ ให้โหลดกระดานคะแนนใหม่
        // เรียกใช้ loadLeaderboard
        loadLeaderboard(); 
    } 
    });
}

// สำหรับเปิด overlay ตาม scoreId ที่ส่งมา
function openCommentOverlay(scoreId) 
{
    currentOpenScoreId = scoreId;
    document.getElementById('comment-overlay').style.display = 'flex'; // แสดง Overlay
    loadComments(scoreId); // ดึงข้อมูลแชท
}

// ปิด Overlay
function closeOverlay() {
    document.getElementById('comment-overlay').style.display = 'none'; // ซ่อน Overlay
    currentOpenScoreId = null;

    // หลังจากปิดก็ทำการโหลดกระดานคะแนนใหม่
    // กรณีมีการเพิ่มคอมเมนต์ใหม่จะได้อัพเดตจำนวนคอมเมนต์
    loadLeaderboard();
    
}

function loadComments(scoreId) {
    fetch(`/comments/${scoreId}`)
    // รับข้อมูลเป็น JSON
    .then(res => res.json())
    .then(comments => {
        
        const chatLog = document.getElementById('chat-log');
        // ล้างข้อมูลเก่า
        chatLog.innerHTML = "";


        comments.forEach(c => {
            const div = document.createElement('div');

            // เช็คว่าเป็นข้อความของเราเองหรือเปล่า เพื่อชิดซ้าย/ขวา
            const isMe = (c.userName === myUsername);
            
            if(isMe)
            {
                div.className = 'chat-bubble chat-right';
            }
            else
            {
                div.className = 'chat-bubble chat-left';
                let nameHtml = `<div class="chat-name">${c.userName}</div>`;
                div.innerHTML = `${nameHtml}${c.commentText}`;
            }
            
            chatLog.appendChild(div);
        });
        
        // เลื่อน Scroll ลงล่างสุดเสมอ
        chatLog.scrollTop = chatLog.scrollHeight;
    });
}

function sendComment() {
    const input = document.getElementById('comment-input');
    // trim เพื่อลบช่องว่างข้างหน้า/หลัง
    const message = input.value.trim();
    
    // ถ้าไม่มีข้อความหรือไม่มี scoreId ที่เปิดอยู่
    if (!message || !currentOpenScoreId) return;

    fetch('/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoreId: currentOpenScoreId, message: message })
    })
    .then(res => {
    if (res.ok) {
        // เคลียร์ช่องพิมพ์
        input.value = ""; 
        // แล้วโหลดคอมเมนต์ใหม่
        loadComments(currentOpenScoreId); 
    } 
    else {
        alert("ไม่สามารถส่งคอมเมนต์ได้");
    }
    });
}
