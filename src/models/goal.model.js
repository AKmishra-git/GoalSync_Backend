import mongoose from 'mongoose';

const quarterlyGoalSchema = new mongoose.Schema({
    quarter:{
        type: String,
        enum: ['Q1', 'Q2', 'Q3', 'Q4'],
       
    },

    plannedTasks:{
        type: Number,
        default: 0
    },

    actualAchieved:{
        type: Number,
        default: 0
    },

    status:{
        type: String,
        enum: ['Not Started', 'In Progress', 'Completed'],
        default: 'Not Started'
    },

    manageComment: {
        type: String,
        default: ''
    },

    score:{
        type: Number,
        default: null
    },

    updatedAt:{
        type: Date
    }

}, {_id: false});


const goalSchema = new mongoose.Schema({
    title:{
        type: String,
        required: true
    },

    description:{
        type: String,
        default: ''
    },

    thrustArea:{
        type: String,
        required: true
    },

    uomType:{
        type: String,
        enum: ['min', 'max', 'timeline', 'zero'],
        required: true
    },


    target: {
        type: Number,
        required: true
    },

    weightage:{
        type: Number,
        required: true
    },

    isShared:{
        type: Boolean,
        default: false
    },

    primaryOwnerId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    quarterlyData: [quarterlyGoalSchema]

});

export default goalSchema;