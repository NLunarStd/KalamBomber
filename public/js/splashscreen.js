window.onload = function() {
    const startButton = document.getElementById('start-btn');
    
    
    function clickToStart() {
        
        // Redirect ไปหน้า Login
        setTimeout(() => {
             
            // Path จาก index.html ไป html/login.html
             window.location.href = '../html/login.html'; 
        }, 100); 
        
        // ป้องกันการคลิกซ้ำ
        startButton.removeEventListener('click', clickToStart);
    }
    
    // ใส่ Event Listener ให้ปุ่ม Start
    startButton.onclick = clickToStart;
};