import serial
import time
class ButtonPanel:

    def __init__(self, portName):
        self.serialPort = serial.Serial(portName, 9600)
        if self.serialPort.is_open:
            while True:
                size = self.serialPort.in_waiting()
                if size:
                    data = self.serialPort.read(size)
                    self.proccessIncomingData(data)
                time.sleep(1)

    def proccessIncomingData(data):
        # Proccess incoming data from control panel (button presses
        print("button panel says")
        print(data)
        print("\n")