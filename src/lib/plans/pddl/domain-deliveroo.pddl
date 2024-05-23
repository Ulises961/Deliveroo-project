;; domain file: domain-deliveroo.pddl
(define (domain deliveroo)
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
        (higher_score ?p1 ?p2)
        (closer ?p1 ?p2)
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
    
    (:action pickup
        :parameters (?me ?parcel ?tile)
        :precondition (and
            (me ?me)
            (at ?me ?tile)
            (at ?parcel ?tile)
            (free ?parcel)
        )
        :effect (and
            (not (free ?parcel))
			(carry ?me ?parcel)
        )
    )
    
    (:action putdown
        :parameters (?me ?parcel ?tile)
        :precondition (and
            (me ?me)
            (at ?me ?tile)
            (carry ?me ?parcel)
        )
        :effect (
			not (carry ?me ?parcel)
        )
    )
    
)