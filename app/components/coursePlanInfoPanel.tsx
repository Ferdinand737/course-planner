import { Button, Input, Popconfirm, message } from "antd";
import { CheckOutlined, DeleteOutlined } from '@ant-design/icons';

import { useEffect, useState } from "react";
import { CoursePlan, Specialization, SpecializationType } from "~/interfaces";
import { Router } from "express";




export default function CoursePlanInfoPanel(props:{
    coursePlan: CoursePlan | null,
    updateCoursePlan: (coursePlan: CoursePlan | null) => void,
}){
    const { coursePlan, updateCoursePlan } = props;
    const currentTitle = coursePlan?.title;

    const majorSpecialization = coursePlan?.degree?.specializations?.find(specialization => specialization.specializationType === SpecializationType.MAJOR);
    const minorSpecialization = coursePlan?.degree?.specializations?.find(specialization => specialization.specializationType === SpecializationType.MINOR);

    const totalCredits = coursePlan?.plannedCourses?.reduce((acc, plannedCourse) => acc + plannedCourse?.course?.credits, 0);


    const [title, setTitle] = useState<string>(currentTitle ?? '');

    function handleTitleChange(){
        const newCoursePlan = {
            ...coursePlan,
            title
        }
        updateCoursePlan(newCoursePlan);
    }


    async function handleDeletePlan(){  
        const response = await fetch(`/coursePlanAPI/${coursePlan?.id}`, {
            method: 'DELETE',
        });

        if(response.ok){
            window.location.href = '/courseplanner';
        }else{
            message.error('Failed to delete plan');
        }
    }

    

    return (
        <div className="flex items-center justify-between">
            <div>
                <label className="mr-2">Plan Title:</label>
                <Input 
                    placeholder="Course Plan Title" 
                    defaultValue={currentTitle} 
                    onChange={(e) => setTitle(e.target.value)}
                    style={{ width: '50%' }}
                />
                <Button 
                    type="primary" 
                    icon={<CheckOutlined />} 
                    className="m-2 mr-4 text-white bg-blue-600 hover:bg-blue-700"
                    onClick={handleTitleChange}
                >
                    Save
                </Button>
                <div>
                    <p>Major: {majorSpecialization?.name}</p>
                    <p>Minor: {minorSpecialization?.name}</p>
                    <p>Total Credits: {totalCredits}</p>
                </div>
            </div>
            <div className="flex">

                <div className="flex items-center">
                    This Is a Requirement:
                    <div className="p-2 m-2 rounded-full w-18 h-18" 
                        style={{
                            position: 'relative',
                            zIndex: 1,
                            backgroundColor: '#7ddcff',
                            borderStyle: 'solid'
                            }}
                    >
                        <p style={{ fontSize: '0.8rem' }}>COSC 360</p>
                    </div>
                </div>

                <div className="flex items-center">
                    This is an Elective:
                    <div className="p-2 m-2 rounded-full w-18 h-18 flex items-center justify-center" 
                        style={{
                            position: 'relative',
                            zIndex: 1,
                            backgroundColor: '#af91db',
                            borderStyle: 'solid'
                            }}
                    >
                        <p style={{ fontSize: '0.8rem' }}>COSC 101</p>
                    </div>
                </div>

                <div className="flex items-center">
                    This is a choice:
                    <div className="p-2 m-2 rounded-full w-18 h-18 flex items-center justify-center" 
                        style={{
                            position: 'relative',
                            zIndex: 1,
                            backgroundColor: '#8ef58e',
                            borderStyle: 'solid'
                            }}
                    >
                        <p style={{ fontSize: '0.8rem' }}>ENGL 154</p>
                    </div>         
                </div>

            </div>
            <div>
                <Popconfirm 
                    title="Are you sure？" 
                    onConfirm={() => handleDeletePlan()} 
                    okText="Yes" 
                    cancelText="No"
                    okButtonProps={{ className: "bg-blue-600  text-white" }}
                >
                <Button type="danger" icon={<DeleteOutlined />} className="m-2 text-white bg-red-600 hover:bg-red-700">
                    Delete Plan
                </Button>
                </Popconfirm>
            </div>
            
        </div>
    )
}