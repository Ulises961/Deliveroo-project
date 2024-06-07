(define (domain path-find)
    (:requirements :strips :negative-preconditions :disjunctive-preconditions)
    (:predicates
        (at ?a ?t) ; agent at tile
        (connected ?t1 ?t2) ; tiles are connected
        (occupied ?t) ; tile is occupied
        (me ?me) ; agent
    )
    
    (:action move
        :parameters (?a ?from ?to)
        :precondition (and
            (at ?a ?from)
            (or (connected ?from ?to)
                (connected ?to ?from))
            (not (occupied ?to))
        )
        :effect (and
            (at ?a ?to)
            (not (at ?a ?from))
        )
    )
)
