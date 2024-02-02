import { DragDropContext, Droppable, Draggable, DraggingStyle, NotDraggingStyle } from "react-beautiful-dnd";



export default function DndTest(){
    const onDragEnd = (result: any) => {};
    console.log("DndTest");
    

    // return(
        // <>
        //     <div>
        //         <DragDropContext onDragEnd={onDragEnd}>
        //             <Droppable droppableId="0">
        //                 {(provided, snapshot) => (
        //                     <>
        //                         <Draggable draggableId="1" index={0}>
        //                             {(provided, snapshot) => (
        //                                 <div
        //                                     ref={provided.innerRef}
        //                                     {...provided.draggableProps}
        //                                     {...provided.dragHandleProps}
        //                                 >
        //                                     <h1>Test</h1>
        //                                 </div>
        //                             )}
        //                         </Draggable>
        //                         <Draggable draggableId="2" index={1}>
        //                             {(provided, snapshot) => (
        //                                 <div
        //                                     ref={provided.innerRef}
        //                                     {...provided.draggableProps}
        //                                     {...provided.dragHandleProps}
        //                                 >
        //                                     <h1>Test2</h1>
        //                                 </div>
        //                             )}
        //                         </Draggable>
        //                         {provided.placeholder}
        //                     </>
        //                 )}
        //             </Droppable>
        //         </DragDropContext>

        //     </div>
        // </>
   // );
}