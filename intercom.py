import RPi.GPIO as GPIO
from enum import Enum

class IntercomState(Enum):
    IDLE = 0
    IS_WAITING = 1
    IS_TALKING = 2
    IS_LISTENING = 3

# Sprechstelle PIU 14/1
class Intercom:
    def __init__(self, callButtonPin, speakLEDPin, waitLEDPin, emergencyBrakePin):
        self.callButtonPin = callButtonPin
        self.speakLEDPin = speakLEDPin
        self.waitLEDPin = waitLEDPin
        self.emergencyBreakPin = emergencyBrakePin

        self.intercomState = IntercomState.IDLE
        self.callIsActive = False
        self.setWaitLEDOff()
        self.setSpeakLEDOff()


    def callButtonDown(self):
        print("Call button down")
        if self.intercomState == IntercomState.IDLE:
            self.makeCall()
        if self.callIsActive == True:
            # If call is active and driver is not speaking, set speaking mode
            self.setIntercomState(IntercomState.IS_TALKING)
        

    def callButtonUp(self):

        print("call button up")
        if self.callIsActive == True:
            if self.intercomState == IntercomState.IS_TALKING:
                self.setIntercomState(IntercomState.IS_LISTENING)

    def setWaitLEDOn(self):
        print("Setting wait LED on")
        GPIO.write(self.waitLEDPin, HIGH)

    def setWaitLEDOff(self):
        print("Setting wait LED off")
        GPIO.write(self.waitLEDPin, LOW)

    def setSpeakLEDOn(self):
        print("Setting speak LED on")
        GPIO.write(self.speakLEDPin, HIGH)

    def setSpeakLEDOff(self):
        print("Setting speak LED off")
        GPIO.write(self.speakLEDPin, LOW)

    def makeCall():
        print("Alerting driver for call")

    def setIntercomState(self,intercomState):
        if intercomState == IntercomState.IDLE:
            self.setSpeakLEDOff()
            self.setWaitLEDOff()

        if intercomState == IntercomState.IS_TALKINGs:
            self.setSpeakLEDOn()
            self.setWaitLEDOff()
        if intercomState == IntercomState.IS_LISTENING:
            self.setWaitLEDOn()
            self.setSpeakLEDoff()
        self.intercomState = intercomState


    