import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
}

export const register = async (req,res) =>{
    console.log(req.body);
    const {name, email, password, role, department, managerId} = req.body;


    try{
        const isUserExists = await User.findOne({email});
         console.log('User exists check done'); 

        if(isUserExists){
            return res.status(400).json({
                message: "User Already Exists"
            })
        }

        const user = await User.create({
            name, email, password, role, department, managerId: managerId||null
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            token: generateToken(user._id)
        });
    }catch(error){
        res.status(500).json({
            message: error.message
        });
    }
}


export const login = async (req, res) =>{
    const {email, password} = req.body;

    try{
        const user = await User.findOne({email});

        if(!user || !(await user.comparePassword(password))){
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            token: generateToken(user._id)
        });
    }catch(error){
        res.status(500).json({
            message: error.message
        });
    }
};


export const getMe = async (req,res)=>{
    res.json(req.user);
}
export const getAllUsers = async (req,res)=>{
    try{
        const users = await User.find().select('-password');
        res.json(users);
    }catch(error){
        res.status(500).json({
            message: error.message
        });
    }
}

export const getTeam = async (req,res)=>{
    try{
        const teamMembers = await User.find({managerId: req.user._id}).select('-password');
        res.json(teamMembers);

    }catch(error){
        res.status(500).json({
            message: error.message
        });
    }

}