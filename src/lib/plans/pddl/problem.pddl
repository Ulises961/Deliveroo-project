;; problem file: problem-pathFinding-1.pddl
(define (problem default)
    (:domain default)
    (:objects
        t0_0
        t0_1
        t0_2
        t0_3
        t0_4
        t0_5
        t0_6
        t0_7
        t0_8
        t0_9
        t2_8
        t1_0
        t1_1
        t1_2
        t1_3
        t1_4
        t1_5
        t1_6
        t1_7
        t1_8
        t1_9
        t2_0
        t2_1
        t2_2
        t2_3
        t2_4
        t2_5
        t2_6
        t2_7
        t2_9
        t3_0
        t3_1
        t3_2
        t3_3
        t3_4
        t3_5
        t3_6
        t3_7
        t3_8
        t3_9
        t4_0
        t4_1
        t4_2
        t4_3
        t4_4
        t4_5
        t4_6
        t4_7
        t4_8
        t4_9
        t5_0
        t5_1
        t5_2
        t5_3
        t5_4
        t5_5
        t5_6
        t5_7
        t5_8
        t5_9
        t6_0
        t6_1
        t6_2
        t6_3
        t6_4
        t6_5
        t6_6
        t6_7
        t6_8
        t6_9
        t7_0
        t7_1
        t7_2
        t7_3
        t7_4
        t7_5
        t7_6
        t7_7
        t7_8
        t7_9
        t8_3
        t8_4
        t8_5
        t8_6
        t8_7
        t8_8
        t8_9
        t9_0
        t9_1
        t9_2
        t9_3
        t9_4
        t9_5
        t9_6
        t9_7
        t9_8
        t9_9
        agent_a0
        me
    )
    (:init
        (tile t0_0)
        (tile t0_1)
        (tile t0_2)
        (tile t0_3)
        (tile t0_4)
        (tile t0_5)
        (tile t0_6)
        (tile t0_7)
        (tile t0_8)
        (tile t0_9)
        (delivery t2_8)
        (tile t1_0)
        (tile t1_1)
        (tile t1_2)
        (tile t1_3)
        (tile t1_4)
        (tile t1_5)
        (tile t1_6)
        (tile t1_7)
        (tile t1_8)
        (tile t1_9)
        (tile t2_0)
        (tile t2_1)
        (tile t2_2)
        (tile t2_3)
        (tile t2_4)
        (tile t2_5)
        (tile t2_6)
        (tile t2_7)
        (tile t2_8)
        (tile t2_9)
        (tile t3_0)
        (tile t3_1)
        (tile t3_2)
        (tile t3_3)
        (tile t3_4)
        (tile t3_5)
        (tile t3_6)
        (tile t3_7)
        (tile t3_8)
        (tile t3_9)
        (tile t4_0)
        (tile t4_1)
        (tile t4_2)
        (tile t4_3)
        (tile t4_4)
        (tile t4_5)
        (tile t4_6)
        (tile t4_7)
        (tile t4_8)
        (tile t4_9)
        (tile t5_0)
        (tile t5_1)
        (tile t5_2)
        (tile t5_3)
        (tile t5_4)
        (tile t5_5)
        (tile t5_6)
        (tile t5_7)
        (tile t5_8)
        (tile t5_9)
        (tile t6_0)
        (tile t6_1)
        (tile t6_2)
        (tile t6_3)
        (tile t6_4)
        (tile t6_5)
        (tile t6_6)
        (tile t6_7)
        (tile t6_8)
        (tile t6_9)
        (tile t7_0)
        (tile t7_1)
        (tile t7_2)
        (tile t7_3)
        (tile t7_4)
        (tile t7_5)
        (tile t7_6)
        (tile t7_7)
        (tile t7_8)
        (tile t7_9)
        (tile t8_3)
        (tile t8_4)
        (tile t8_5)
        (tile t8_6)
        (tile t8_7)
        (tile t8_8)
        (tile t8_9)
        (tile t9_0)
        (tile t9_1)
        (tile t9_2)
        (tile t9_3)
        (tile t9_4)
        (tile t9_5)
        (tile t9_6)
        (tile t9_7)
        (tile t9_8)
        (tile t9_9)
        (at agent_a0 t8.6_8)
        (at me t0_9)
        (parcel t2_8)
        (free t2_8)
        (parcel t4_4)
        (free t4_4)
    )
    (:goal
        (at me t2_8)
    )
)