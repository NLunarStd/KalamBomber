window.onload = function pageLoad() {
    
    const errorDisplay = document.getElementById('errordisplay');
    const registerForm = document.querySelector('.form');
    
    registerForm.addEventListener('submit', function(e) {

        // ดึงค่าจาก Input
        const passwordInput = registerForm.elements['password'].value;
        const repasswordInput = registerForm.elements['repassword'].value;
        
        // ล้างคลาสเดิม
        errorDisplay.className = '';
        // เพิ่มคลาส errorDisplayText ให้
        errorDisplay.classList.add('errorDisplayText');

        // ตรวจสอบว่ารหัสผ่านตรงกันไหม
        if (passwordInput !== repasswordInput) {
            e.preventDefault(); 
            errorDisplay.textContent = 'รหัสผ่านที่กรอกไม่ตรงกัน';
            return;
        }

        // ถ้าตรงกัน ให้ล้างข้อความ Error 
        errorDisplay.textContent = ''; 
    });

    
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('error')) {
        const error = urlParams.get('error');
        
        // ล้างคลาสเดิม
        errorDisplay.className = '';
        // เพิ่มคลาส errorDisplayText ให้
        errorDisplay.classList.add('errorDisplayText');
        
        if (error === 'exists') {
            errorDisplay.textContent = 'ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว';
        } else if (error === 'mismatch') { 
            errorDisplay.textContent = 'รหัสผ่านที่กรอกไม่ตรงกัน';
        }
        else{
            errorDisplay.textContent = 'การลงทะเบียนผิดพลาด ';
        }
    }
};