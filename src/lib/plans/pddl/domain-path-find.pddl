;; domain file: domain-path-find.pddl
(define (domain path-find)
    (:requirements :strips :negative-preconditions)
    (:predicates
        (tile ?t)
        (delivery ?d)
        (agent ?a)
        (parcel ?p)
        (me ?a)
        (at ?agentOrParcel ?tile)
        (right ?t1 ?t2)
        (left ?t1 ?t2)
        (up ?t1 ?t2)
        (down ?t1 ?t2)
        (carry ?a ?p)
        (free ?p)
    )
    
    (:action right
        :parameters (?me ?from ?to ?agent)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (not (at ?agent ?to))
            (right ?from ?to)
        )
        :effect (and
            (at ?me ?to)
			(not (at ?me ?from))
        )
    )
    
    (:action left
        :parameters (?me ?from ?to ?agent)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (not (at ?agent ?to))
            (left ?from ?to)
        )
        :effect (and
            (at ?me ?to)
			(not (at ?me ?from))
        )
    )
    
    (:action up
        :parameters (?me ?from ?to ?agent)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (not (at ?agent ?to))
            (up ?from ?to)
        )
        :effect (and
            (at ?me ?to)
			(not (at ?me ?from))
        )
    )
    
    (:action down
        :parameters (?me ?from ?to ?agent)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (not (at ?agent ?to))
            (down ?from ?to)
        )
        :effect (and
            (at ?me ?to)
			(not (at ?me ?from))
        )
    )
)