class ApiResponse {
  statusCode: number;
  data: any;
  message: string = "Success";
  success: boolean;

  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}
