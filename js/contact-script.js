function sub() {
            if(document.getElementById('name').value == "" || document.getElementById('phone').value == "" || document.getElementById('email').value == "" || document.getElementById('msg').value == "" ){
                alert("PLAESE FILL ALL DETAILS!")
            }
            else if(document.getElementById('name').value != "" && document.getElementById('phone').value != "" && document.getElementById('email').value != "" && document.getElementById('msg').value != "" ){            
            document.getElementById("finalbtn").innerHTML = "SENDING...";
            setTimeout(function () {
                document.getElementById("finalbtn").innerHTML = "SEND";
                document.getElementById("subdone").style = "display:block; font-family:sans-serif";
            }, 2000);
            setTimeout(() => {
                document.getElementById('subdone').style = "display:none";
            }, 3000);
            setTimeout(() => {
                window.location.href = "/OES";
            }, 5000);
            }
            console.log(ViewTimeline);
        }