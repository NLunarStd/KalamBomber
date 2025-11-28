function checkCookie(){
    var username = "";
    if(getCookie("username")==false){
        window.location = "/html/login.html";
    }
}
// checkCookie ก่อนโหลดหน้า
checkCookie();
window.onload = pageLoad;

function getCookie(name){
    var value = "";
    try{
        value = document.cookie.split("; ").find(row => row.startsWith(name)).split('=')[1]
        return value
    }catch(err){
        return false
    } 
}

function pageLoad(){

    // ต้องมีปุ่ม 3 ปุ่ม คือ เล่นเกม, กระดานคะแนน, ออกจากระบบ
    const playGameBtn = document.getElementById('playGameBtn');
    if (playGameBtn) playGameBtn.onclick = playGame;
    
    const leaderboardBtn = document.getElementById('leaderboardBtn');
    if (leaderboardBtn) leaderboardBtn.onclick = goToLeaderboard;
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.onclick = logout;
}

function playGame(){
    window.location.href = "../GameKalamBomber/gameplay.html";
}

function goToLeaderboard(){
    window.location.href = "../html/leaderboard.html";
}

function logout(){
    document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";// ลบ cookie
    fetch('/logout', { method: 'POST' })
        .then(() => {
            
            window.location.href = "../html/login.html"; //จาก html/mainmenu.html ไป html/login.html
        })
        .catch(error => {
            console.error("Logout failed, redirecting anyway:", error);
            window.location.href = "../html/login.html";
        });
}