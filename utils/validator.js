const isValidPincode = (pincode) => {
  return /^[0-9]{6}$/.test(pincode);
};

const isValidMobile = (mobilenumber) => {
  return /^[0-9]{10}$/.test(mobilenumber);
};

const isValidName=(name)=>{
    return /^[a-zA-Z\s]+$/.test(name)
}


module.exports={isValidMobile,isValidPincode,isValidName}