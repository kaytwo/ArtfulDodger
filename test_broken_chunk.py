import socket
import SocketServer
import sys
import time

bad_chunk_response =  '''\
HTTP/1.1 200 OK
Content-Type: text/plain
Transfer-Encoding: chunked

1a
abcdefghijklmnopqrstuvwxyz
10
1234567890abcdef
'''
resp_2 = '''\
10
1234567890qwerty
'''
bad_chunk_response = bad_chunk_response.replace('\n','\r\n')
resp_2 = resp_2.replace('\n','\r\n')
# sys.exit()
class BadChunkHandler(SocketServer.BaseRequestHandler):
    def handle(self):  
      while True:
        self.data = self.request.recv(2048)
        if not self.data:
            break
        self.request.send(bad_chunk_response)
        time.sleep(5)
        self.request.send(resp_2)

if __name__ == "__main__":
    HOST, PORT = "localhost", 9999

    # Create the server, binding to localhost on port 9999
    server = SocketServer.TCPServer((HOST, PORT), BadChunkHandler)
    server.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    # Activate the server; this will keep running until you
    # interrupt the program with Ctrl-C
    server.serve_forever()
