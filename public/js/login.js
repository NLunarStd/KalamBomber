window.onload = function() {

    const errorDisplay = document.getElementById('errordisplay');

    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('error')) {

        // ล้างคลาสเดิม
        errorDisplay.className = '';
        // เพิ่มคลาส errorDisplayText ให้
        errorDisplay.classList.add('errorDisplayText');

        // check จาก redirect ของ server.js ว่ามี error อะไรมา
        const error = urlParams.get('error');

        // เช็คค่า error ที่เราส่งมาจาก server.js (บรรทัด res.redirect)
        if (error === 'invalid') {
            errorDisplay.textContent = 'username หรือ password ไม่ถูกต้อง';
        } else if (error === '1') {
            errorDisplay.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
        } else {
            errorDisplay.textContent = 'เกิดข้อผิดพลาดบางอย่าง';
        }
    }

    if (urlParams.has('success')) {
        //ถ้ารับมา sucess จะมาจาก register

        // ล้างคลาสเดิม
        errorDisplay.className = '';
        // เพิ่มคลาส errorDisplayText ให้
        errorDisplay.classList.add('successDisplayText');

        errorDisplay.textContent = 'Register complete กรุณาเข้าสู่ระบบ';
    }

    const registerBtn = document.getElementById('register-btn');

    // ใส่ event ให้ปุ่ม register
    // ให้เมื่อคลิกจะไปหน้า register.html
    registerBtn.addEventListener('click', function()
    {
        window.location.href = 'register.html'; 
    });

};