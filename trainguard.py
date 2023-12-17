# Trainguard controller, should talk to central server via TCP

from enum import Enum

class SwitchState(Enum):
    UNKNOWN = 0
    STRAIGHT = 1
    LEFT = 2
    RIGHT = 3

class Trainguard:
    
    def __init__(self, nextSwitchState):
        print("Init trainguard")

    def setNextSwitchState(switchState):
        print("Sending next desired switch state to server")
    
