import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getUserCoursePlan } from "~/models/coursePlan.server";
import { requireUserId } from "~/session.server";
import { DragDropContext, Droppable, Draggable, DraggingStyle, NotDraggingStyle } from "react-beautiful-dnd";
import { useState } from "react";


export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    const userId = await requireUserId(request);
    const coursePlan = await getUserCoursePlan(params.planId || '');
    return json({ coursePlan });
};


export const action = async ({ params, request }: ActionFunctionArgs) => {

};

export default function NewCoursePlan(){
    const data = useLoaderData<typeof loader>();
    const plan = data.coursePlan;

    const plannedCourses = plan?.plannedCourses;
    const numYears = plan?.numTerms / 4 ?? 0;

    const getItems = (count: number, offset = 0) =>
        Array.from({ length: count }, (v, k) => k).map(k => ({
        id: `item-${k + offset}-${new Date().getTime()}`,
        content: `item ${k + offset}`
    }));

    const [state, setState] = useState([getItems(10), getItems(5, 10)]);

    
    const move = (source: Iterable<unknown> | ArrayLike<unknown>, destination: Iterable<unknown> | ArrayLike<unknown>, droppableSource: { index: number; droppableId: string | number; }, droppableDestination: { index: number; droppableId: string | number; }) => {
        const sourceClone = Array.from(source);
        const destClone = Array.from(destination);
        const [removed] = sourceClone.splice(droppableSource.index, 1);
      
        destClone.splice(droppableDestination.index, 0, removed);
      
        const result = {};
        result[droppableSource.droppableId] = sourceClone;
        result[droppableDestination.droppableId] = destClone;
      
        return result;
      };


    const reorder = (list: Iterable<unknown> | ArrayLike<unknown>, startIndex: number, endIndex: number) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
      
        return result;
    };

    const grid = 8;
    const getItemStyle = (isDragging: boolean, draggableStyle: DraggingStyle | NotDraggingStyle | undefined) => ({
        // some basic styles to make the items look a bit nicer
        userSelect: 'none',
        padding: grid * 2,
        margin: `0 ${grid}px 0 0`,
      
        // change background colour if dragging
        background: isDragging ? 'lightgreen' : 'grey',
      
        // styles we need to apply on draggables
        ...draggableStyle,
    });
    
    const getListStyle = (isDraggingOver: boolean) => ({
        background: isDraggingOver ? "lightblue" : "lightgrey",
        padding: grid,
        width: 250
      });




    // function RenderCourse({ course, index }: { course: any, index: number }){
    //     return(
    //         <div className="p-2 m-2 bg-gray-100 rounded-md">
    //             <p>{course.course.code}</p>
    //         </div>
    //     )
    // }
    
    // function RenderTerm({ absoluteTerm }: { absoluteTerm: number }){
    //     const termNames = ["Winter 1", "Winter 2", "Summer 1", "Summer 2"];
    //     return(
    //         <div className="p-4 border-b flex flex-col md:flex-row justify-between w-full">
    //             <h1 className="font-bold text-lg">{termNames[(absoluteTerm - 1) % 4]}</h1>
    //             <div className="flex flex-wrap">
    //                 {plannedCourses?.filter(course => course.term === absoluteTerm).map((course, index) => (
    //                     <RenderCourse key={course.id} course={course} index={index} />
    //                 ))}
    //             </div>
    //         </div>
    //     )
    // }
    
    // function RenderYear(props: { year: number }){
    //     return(
    //         <div className="max-w-full bg-white rounded-xl shadow-md overflow-hidden md:max-w-full m-4">
    //             <div className="p-8 w-full">
    //                 <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
    //                     Year {props.year}
    //                 </div>
    //                 {Array.from({ length: 4 }, (_, index) => (
    //                     <RenderTerm key={index} absoluteTerm={(props.year - 1) * 4 + index + 1} />
    //                 ))}
    //             </div>
    //         </div>
    //     )
    // }

    function onDragEnd(result: { source: any; destination: any; }) {
        const { source, destination } = result;
    
        // dropped outside the list
        if (!destination) {
          return;
        }
        const sInd = +source.droppableId;
        const dInd = +destination.droppableId;
    
        if (sInd === dInd) {
          const items = reorder(state[sInd], source.index, destination.index);
          const newState = [...state];
          newState[sInd] = items;
          setState(newState);
        } else {
          const result = move(state[sInd], state[dInd], source, destination);
          const newState = [...state];
          newState[sInd] = result[sInd];
          newState[dInd] = result[dInd];
    
          setState(newState.filter(group => group.length));
        }
    }
    
    return(
        <>
            <DragDropContext onDragEnd={onDragEnd}>
                {state.map((el, ind) => (
                    <Droppable key={ind} droppableId={`${ind}`} direction="horizontal">
                        {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            style={getListStyle(snapshot.isDraggingOver)}
                            {...provided.droppableProps}
                        >
                            {el.map((item, index) => (
                            <Draggable
                                key={item.id}
                                draggableId={item.id}
                                index={index}
                            >
                                {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={getItemStyle(
                                    snapshot.isDragging,
                                    provided.draggableProps.style
                                    )}
                                >
                                    <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-around"
                                    }}
                                    >
                                    {item.content}
                                    <button
                                        type="button"
                                        onClick={() => {
                                        const newState = [...state];
                                        newState[ind].splice(index, 1);
                                        setState(
                                            newState.filter(group => group.length)
                                        );
                                        }}
                                    >
                                        delete
                                    </button>
                                    </div>
                                </div>
                                )}
                            </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                        )}
                  </Droppable>
                ))}
            </DragDropContext>
        </>
    );
}