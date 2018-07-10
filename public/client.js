window.onload = function() {
  var nameElement = document.getElementById("target");
  var name2Element = document.getElementById("target-2");
  
  captainOther(nameElement.options[nameElement.selectedIndex].value);
  classOther(name2Element.options[name2Element.selectedIndex].value);
}

function captainOther(val){
 var element = document.getElementById('other-target');
 if(val === 'other') {
   element.style.display='block';
 } else {  
   element.style.display='none';
 }
}

function classOther(val){
 var element = document.getElementById('other-target-2');
 if(val === 'other') {
   element.style.display='block';
 } else {  
   element.style.display='none';
 }
}
